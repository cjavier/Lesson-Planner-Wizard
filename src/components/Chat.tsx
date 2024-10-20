import React, { useEffect, useState } from "react";
import { TextField, Button, Container, Grid, LinearProgress, CircularProgress } from "@mui/material";
import Message from "./Message";
import { MessageDto } from "../models/MessageDto";
import SendIcon from "@mui/icons-material/Send";
import { initOpenAIAssistant, sendMessageToAssistant } from "../components/openaiAssistant";

const Chat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(new Array<MessageDto>());
  const [input, setInput] = useState<string>("");
  const [assistant, setAssistant] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [openai, setOpenai] = useState<any>(null);

  useEffect(() => {
    initChatBot().catch((error) => console.error("Error initializing chatbot:", error));
  }, []);

  useEffect(() => {
    setMessages([
      {
        content: "Hello, I'm your **Social Communication Lesson Planning Assistant**. I can recommend you the best content for your caseload.",
        isUser: false,
      },
    ]);
  }, [assistant]);

  const initChatBot = async () => {
    const { openai, assistant, thread } = await initOpenAIAssistant();
    setOpenai(openai);
    setAssistant(assistant);
    setThread(thread);
  };

  const createNewMessage = (content: string, isUser: boolean) => {
    return new MessageDto(isUser, content);
  };

  const handleSendMessage = async () => {
    // Agregar el nuevo mensaje del usuario
    const newMessage = createNewMessage(input, true);
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Limpiar el input
    setInput("");

    // Enviar mensaje al asistente
    await sendMessageToAssistant(openai, thread, assistant, input, setIsWaiting, setMessages, createNewMessage);
  };

  // Detectar la tecla Enter y enviar el mensaje
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <Container>
      <Grid container direction="column" spacing={2} paddingBottom={2}>
        {messages.map((message, index) => (
          <Grid item alignSelf={message.isUser ? "flex-end" : "flex-start"} key={index}>
            <Message key={index} message={message} />
          </Grid>
        ))}
      </Grid>
      <Grid container direction="row" paddingBottom={5} justifyContent={"space-between"}>
        <Grid item sm={11} xs={9}>
          <TextField
            label="Type your message"
            variant="outlined"
            disabled={isWaiting}
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          {isWaiting && <LinearProgress color="inherit" />}
        </Grid>
        <Grid item sm={1} xs={3}>
          <Button variant="contained" size="large" color="primary" onClick={handleSendMessage} disabled={isWaiting}>
            {isWaiting && <CircularProgress color="inherit" />}
            {!isWaiting && <SendIcon fontSize="large" />}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Chat;
