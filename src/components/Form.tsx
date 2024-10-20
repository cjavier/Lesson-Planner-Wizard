import React, { useEffect, useState } from "react";
import { TextField, Input, Button, Container, Grid, LinearProgress, CircularProgress, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import Message from "./Message";
import { MessageDto } from "../models/MessageDto";
import SendIcon from "@mui/icons-material/Send";
import axios from 'axios';

const FormChat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(new Array<MessageDto>());
  const [threadId, setThreadId] = useState<string | null>(null);

  // Campos del formulario
  const [skill, setSkill] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [goal, setGoal] = useState<string>("");

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

  // Manejar el envío del formulario
  const handleSendMessage = async () => {
    if (!threadId) {
      console.error("Thread ID is not set.");
      return;
    }

    // Concatenar el mensaje basado en los valores del formulario
    const concatenatedMessage = `Skill: ${skill}, Age Group: ${ageGroup}, Goal: ${goal}`;
    const newMessage = createNewMessage(concatenatedMessage, true);

    // Agregar el nuevo mensaje del usuario al estado
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Limpiar el input
    setSkill("");
    setAgeGroup("");
    setGoal("");

    // Iniciar el proceso de espera para la respuesta
    setIsWaiting(true);

    try {
      // Enviar el mensaje al backend para procesarlo con el asistente
      const response = await axios.post('http://localhost:5001/sendMessageToThread', {
        threadId: threadId,
        message: concatenatedMessage,
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

  return (
    <Container>
      <Grid container direction="column" spacing={2} paddingBottom={2}>
        {messages.map((message, index) => (
          <Grid item alignSelf={message.isUser ? "flex-end" : "flex-start"} key={index}>
            <Message key={index} message={message} />
          </Grid>
        ))}

        {/* Formulario para Skill, Age Group y Goal */}
        <Grid item>
          <FormControl fullWidth margin="normal">
            <InputLabel id="skill-label">Skill</InputLabel>
            <Select
              labelId="skill-label"
              value={skill}
              onChange={(e) => setSkill(e.target.value as string)}
            >
              <MenuItem value="Communication">Communication</MenuItem>
              <MenuItem value="Social Interaction and Relationships">Social Interaction and Relationships</MenuItem>
              <MenuItem value="Emotional Regulation and Self-Control">Emotional Regulation and Self-Control</MenuItem>
              <MenuItem value="Problem-Solving and Decision-Making">Problem-Solving and Decision-Making</MenuItem>
              <MenuItem value="Personal Development and Life Skills">Personal Development and Life Skills</MenuItem>
              <MenuItem value="Physical and Mental Wellbeing">Physical and Mental Wellbeing</MenuItem>
              <MenuItem value="Practical Tasks and Responsibilities">Practical Tasks and Responsibilities</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="age-group-label">Age Group</InputLabel>
            <Select
              labelId="age-group-label"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as string)}
            >
              <MenuItem value="Pre-k">Pre-k</MenuItem>
              <MenuItem value="Kindergarten">Kindergarten</MenuItem>
              <MenuItem value="Elementary School">Elementary School</MenuItem>
              <MenuItem value="Middle & High School">Middle & High School</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel htmlFor="goal-input">Goal</InputLabel>
            <Input
              id="goal-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe your goal"
              fullWidth
            />
          </FormControl>
        </Grid>
      </Grid>

      <Grid container direction="row" paddingBottom={5} justifyContent={"space-between"}>
        <Grid item sm={11} xs={9}>
          {isWaiting && <LinearProgress color="inherit" />}
        </Grid>
        <Grid item sm={1} xs={3}>
          <Button
            variant="contained"
            size="large"
            color="primary"
            onClick={handleSendMessage}
            disabled={isWaiting || !skill || !ageGroup || !goal} // Deshabilitar si los campos no están completos
          >
            {isWaiting && <CircularProgress color="inherit" />}
            {!isWaiting && <SendIcon fontSize="large" />}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FormChat;
