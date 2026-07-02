import React from "react";
import { Surface } from "./Surface";

function Card(props) {
  return <Surface variant="container-low" shape="md" {...props} />;
}

export { Card };
export default Card;
