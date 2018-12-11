import styled, { keyframes } from 'styled-components';

export const Home = styled.div`
  margin-top: 50px;
  position: absolute;
`;

export const moveUp = keyframes`
  from {
    margin-top: 200px;
  }

  to {
    margin-top: 50px;
  }
`;


export const BigText = styled.p`
  text-align: center;
  font-size: 48px;
  margin-top: 50px;
  margin-left: 25%;
  animation: ${moveUp} 1s;
`;
