import "@/App.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./i18n";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdminPage from "./pages/Admin";
import UpdatePage from "./pages/UpdatePage";
import DeclarationPage from "./pages/DeclarationPage";
import BotOrderPage from "./pages/BotOrderPage";
import { SolanaProvider } from "./contexts/SolanaProvider";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App">
      <SolanaProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/update" element={<UpdatePage />} />
            <Route path="/declaration/:id" element={<DeclarationPage />} />
            <Route path="/bot-order/:botId" element={<BotOrderPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </SolanaProvider>
    </div>
  );
}

export default App;
