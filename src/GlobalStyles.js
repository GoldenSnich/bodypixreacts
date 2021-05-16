import { createGlobalStyle } from "styled-components";
import reset from "styled-reset";

const globalStyles = createGlobalStyle`
    ${reset};

    ul, li, ol {
        text-decoration: none;
    }

    body {
      margin: 0;
      width: 100%;
      background-color: #151515;
      color: white;
    }
`;

export default globalStyles;