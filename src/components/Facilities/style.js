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

export const FacilitiesArea = styled.div`
  float: left;
`;

export const FacilitiesAreaTwo = styled.div`
  float: right;
`;

export const Facility = styled.div`
  min-height: 400px;
  height: auto;
  padding: 100px;
  margin: 150px;
`;
