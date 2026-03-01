import { EmptyScreen } from "./empty-screen";
import { v4 as uuidv4 } from "uuid";

export const Home = () => {
  const id = uuidv4();

  return <EmptyScreen id={id} />;
};
