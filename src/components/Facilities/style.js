import styled, { keyframes } from 'styled-components';

export const moveUp = keyframes`
  from {
    margin-left: 200px;
  }

  to {
    margin-left: 100px;
  }
`;


export const BigText = styled.p`
  text-align: center;
  font-size: 20px;
`;

export const Facility = styled.div`
  min-height: 400px;
  height: auto;
  padding: 50px;
  background: rgba(45,45,45,0.98);
  color: white;
`;
