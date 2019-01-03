import styled from 'styled-components';


export const CardArea = styled.div`
  height: 300px;
  background: #fafafa;
  width: 200px;
  margin: 40px;
  border-radius: 5px;
  display: inline-block;
  text-align: center;
  cursor: pointer;
  &:hover {
    box-shadow: 0 0 20px 3px#e8e8e8;
  }
  @media (max-width: 600px) {
    border: none;
    box-shadow: 0 0 20px 3px#e8e8e8;
  }
`;

export const Title = styled.h1`
  color: grey;
`;

export const Rate = styled.h1`
  font-size: 56px;

`;

export const DescTitle = styled.h6`

`;

export const Desc = styled.h4`

`;
