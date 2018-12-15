import styled, { keyframes } from 'styled-components';

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
  animation: ${moveUp} 1s;
`;
