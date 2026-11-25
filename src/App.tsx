import { ThemeProvider } from "./context/ThemeContext";
import { ExplorerLayout } from "./components/layout/ExplorerLayout";

export function App() {
  return (
    <ThemeProvider>
      <ExplorerLayout />
    </ThemeProvider>
  );
}

export default App;
