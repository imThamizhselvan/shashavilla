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
  margin-top: 50px;
`;

export const LeftSide = styled.div`
  float: left;
`;


export const FacilitiesArea = styled.div`
  border:1px solid red;
  text-align: center;
  margin: 30px;
`;
