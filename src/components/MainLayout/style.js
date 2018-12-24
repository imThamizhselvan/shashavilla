import styled, { keyframes } from 'styled-components';


export const moveUp = keyframes`
  from {
    margin-top: 200px;
  }

  to {
    top: 30%;
  }
`;

export const Center = styled.div`
  position: absolute;
  top: 30%;
  left: 10% ;
  font-size: 48px;
  animation: ${moveUp} 1s;
  text-align: center;
  color: #322f35;
  @media (max-width: 480px) {
    font-size: 18px;
    left: 5% ;
  }
`;

export const Img = styled.img`
  border-radius: 8px;
  max-width: 100%;
  height: auto;
  margin-left: auto;
  margin-right: auto;
  display: block;
  width: 100%;
`;

export const Home = styled.div`
  margin-top: 50px;
  position: relative;
`;
