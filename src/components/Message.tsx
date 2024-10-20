import React from "react";
import { MessageDto } from "../models/MessageDto";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  message: MessageDto;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div style={{ textAlign: message.isUser ? "right" : "left", margin: "8px" }}>
      <div
        style={{
          color: message.isUser ? "#ffffff" : "#000000",
          backgroundColor: message.isUser ? "#1186fe" : "#eaeaea",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        {/* Usamos ReactMarkdown para renderizar el contenido Markdown correctamente */}
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Message;
