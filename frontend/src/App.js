import "@/App.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./i18n";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { SolanaProvider } from "./contexts/SolanaProvider";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App">
      <SolanaProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </SolanaProvider>
    </div>
  );
}

export default App;
