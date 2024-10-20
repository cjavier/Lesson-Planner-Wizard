import OpenAI from "openai";
import { tools } from "./everydayspeechFunctions";
import { get_content } from "./everydayspeechFunctions";

export const initOpenAIAssistant = async () => {
  const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const assistant = {
    "id": "asst_Km7yCBGpA2krZPYZnPjN7gfs",
    "tools": tools
  };
  console.log("Assistant:", assistant);

  const thread = await openai.beta.threads.create();
  
  console.log(`Thread ID: ${thread.id}`);

  return { openai, assistant, thread };
};

export const submitToolOutputs = async (openai: any, threadId: string, runId: string, toolCallId: string, result: any) => {
  console.log(`Submitting tool output for Thread ID: ${threadId}, Run ID: ${runId}, Tool Call ID: ${toolCallId}`);
  console.log("Tool Output Result:", result);

  await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
    tool_outputs: [
      {
        tool_call_id: toolCallId,
        output: JSON.stringify(result),
      },
    ],
  });

  console.log("Tool output submitted, now retrieving run status...");

  let runResponse = await openai.beta.threads.runs.retrieve(threadId, runId);
  console.log("Run Response after retrieve:", runResponse);

  while (runResponse.status === "in_progress" || runResponse.status === "queued") {
    console.log("Waiting for final response after submitting tool output...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    runResponse = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log("Run status during waiting loop after tool output:", runResponse.status);
  }

  return runResponse;
};

export const sendMessageToAssistant = async (openai: any, thread: any, assistant: any, input: string, setIsWaiting: Function, setMessages: Function, createNewMessage: Function) => {
  console.log(`Sending message to Thread ID: ${thread.id}`);

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: input,
  });

  console.log("Message sent to thread");

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  console.log(`Run ID: ${run.id}`);

  let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  console.log("Initial run response:", response);

  while (response.status === "in_progress" || response.status === "queued") {
    console.log("Waiting for the assistant's response...");
    setIsWaiting(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log("Run status during waiting loop:", response.status);
  }

  setIsWaiting(false);

  console.log("Final run response:", response);

  const toolCalls = response?.required_action?.submit_tool_outputs?.tool_calls;
  console.log("Tool Calls:", toolCalls);

  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0];
    const parsedArguments = JSON.parse(toolCall.function.arguments);
    console.log("Parsed Arguments:", parsedArguments);

    let result;

    if (toolCall.function.name === "get_content") {
      console.log("Calling get_content function");
      const { Skill, AgeGroup, Goal } = parsedArguments;
      const contentData = await get_content({ Skill, AgeGroup, Goal });
      console.log("Content Data:", contentData);
      result = contentData;
    } 
    /* else if (toolCall.function.name === "get_content") {
      console.log("Calling get_content function");
      const { Skill, AgeGroup, Goal } = parsedArguments;
      const contentData = await get_content({ Skill, AgeGroup, Goal });
      console.log("Content Data:", contentData);
      result = contentData;
    } */
  

    const finalRunResponse = await submitToolOutputs(openai, thread.id, run.id, toolCall.id, result);

    if (finalRunResponse.status === "completed") {
      const finalMessageList = await openai.beta.threads.messages.list(thread.id);
      console.log("Final Message List after Tool Output:", finalMessageList);

      const lastMessage = finalMessageList.data
        .filter((message: any) => message.run_id === finalRunResponse.id && message.role === "assistant")
        .pop();
      console.log("Last Message Retrieved after Tool Output:", lastMessage);

      if (lastMessage && lastMessage.content) {
        console.log("Last Message Content after Tool Output:", lastMessage.content);
        setMessages((prevMessages: any) => [...prevMessages, createNewMessage(lastMessage.content[0]["text"].value, false)]);
      }
    }
  } else {
    // No tool call, display the regular assistant response
    const finalMessageList = await openai.beta.threads.messages.list(thread.id);
    console.log("Final Message List:", finalMessageList);

    const lastMessage = finalMessageList.data
      .filter((message: any) => message.run_id === run.id && message.role === "assistant")
      .pop();
    console.log("Last Message Retrieved:", lastMessage);

    if (lastMessage && lastMessage.content) {
      console.log("Displaying assistant's response without tool call.");
      setMessages((prevMessages: any) => [...prevMessages, createNewMessage(lastMessage.content[0]["text"].value, false)]);
    }
  }
};