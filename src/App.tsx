// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Chat from './components/Chat';
import Form from './components/Form'; 

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1 style={{ textAlign: 'center' }}>Lesson Planner Wizard</h1>
        </header>
        <main>
          <Routes>
            {/* Ruta para el Chat principal */}
            <Route path="/" element={<Chat />} />
                        
            {/* Ruta para el nuevo componente form */}
            <Route path="/form" element={<Form />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
