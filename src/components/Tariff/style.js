import styled from 'styled-components';


export const Area = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
`;

export const DescText = styled.p`
  text-align: center;
`;

export const Card = styled.div`
  height: 300px;
  background: #8e8686;
  width: 200px;
  margin: 40px;
  border-radius: 5px;
  display: inline-block;
  border: 1px solid #e8e8e8;
  &:hover {
    border: none;
    box-shadow: 0 0 20px 3px#e8e8e8;
  }
  `;
