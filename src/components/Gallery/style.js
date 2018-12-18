import styled from 'styled-components';


export const Header = styled.div`
  text-align: center;
  padding: 32px;
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 0 4px;
`;

export const Column = styled.div`
  flex: 25%;
  max-width: 25%;
  padding: 0 4px;
  @media (max-width: 800px) {
    flex: 50%;
    max-width: 50%;
  }
  @media (max-width: 600px) {
    flex: 100%;
    max-width: 100%;
  }
`;

export const Img = styled.img`
  margin-top: 8px;
  vertical-align: middle;
  width: 100%;
`;
