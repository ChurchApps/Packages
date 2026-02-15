import React from "react";

interface Props {
  children: React.ReactNode
}

export const Banner = (props:Props) => {
  return (<div id="banner">
    {props.children}
  </div>);
};
