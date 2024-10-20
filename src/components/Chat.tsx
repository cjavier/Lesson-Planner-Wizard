import React, { useEffect, useState } from "react";
import { TextField, Button, Container, Grid, LinearProgress, CircularProgress } from "@mui/material";
import Message from "./Message";
import { MessageDto } from "../models/MessageDto";
import SendIcon from "@mui/icons-material/Send";
import axios from 'axios';

const Chat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(new Array<MessageDto>());
  const [input, setInput] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);

  // Al montar el componente, verificamos si hay un threadId en localStorage, si no, creamos uno nuevo
  useEffect(() => {
    const storedThreadId = localStorage.getItem("threadId");
    if (storedThreadId) {
      setThreadId(storedThreadId);
      console.log(`Thread ID: ${storedThreadId}`);
    } else {
      initChatBot().catch((error) => console.error("Error initializing chatbot:", error));
    }
  }, []);

  // Mensaje inicial al crear el thread
  useEffect(() => {
    if (threadId) {
      setMessages([
        {
          content: "Hello, I'm your **Social Communication Lesson Planning Assistant**. I can recommend you the best content for your caseload.",
          isUser: false,
        },
      ]);
    }
  }, [threadId]);

  // Crear un nuevo thread al iniciar el chat y guardar el threadId en localStorage
  const initChatBot = async () => {
    try {
      console.log("Creating new thread...");
      const response = await axios.post('http://localhost:5001/createThread');
      const newThreadId = response.data.threadId;
      setThreadId(newThreadId);
      console.log(`Thread ID: ${newThreadId}`);
      localStorage.setItem("threadId", newThreadId);  // Guardar el threadId en localStorage
    } catch (error) {
      console.error("Error creating thread:", error);
    }
  };

  // Crear un nuevo mensaje
  const createNewMessage = (content: string, isUser: boolean) => {
    return new MessageDto(isUser, content);
  };

  // Enviar el mensaje al thread
  const handleSendMessage = async () => {
    if (!threadId) {
      console.error("Thread ID is not set.");
      return;
    }

    // Agregar el nuevo mensaje del usuario a la lista de mensajes
    const newMessage = createNewMessage(input, true);
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Limpiar el input
    setInput("");

    // Iniciar el proceso de espera para la respuesta
    setIsWaiting(true);

    try {
      // Enviar el mensaje al backend para procesarlo con el asistente
      const response = await axios.post('http://localhost:5001/sendMessageToThread', {
        threadId: threadId,
        message: input,
      });

      // Obtener la respuesta del asistente
      const assistantMessage = response.data.message;

      // Agregar la respuesta del asistente a la lista de mensajes
      const newAssistantMessage = createNewMessage(assistantMessage, false);
      setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
    } catch (error) {
      console.error("Error sending message to thread:", error);
    } finally {
      setIsWaiting(false);
    }
  };

  // Detectar la tecla Enter y enviar el mensaje
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isWaiting) {
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
            {isWaiting ? <CircularProgress color="inherit" /> : <SendIcon fontSize="large" />}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Chat;
