import styled from 'styled-components';

export const Bar = styled.div`
  height: 50px;
  background: rgba(45,45,45,0.98);
  color: #fff;
  display: flex-container;
  width: 100%;
  position: fixed;
  z-index: 9999;
  @media (max-width: 600px) {
    text-align: center;
    height: 55px;
  }
`;


export const Logo = styled.a`
  font-size: 30px;
  cursor: pointer;
  text-decoration: none;
  color: #fff;
  @media (min-width: 601px) {
    float: left;
    padding-left: 30px;
    padding-top: 6px;
  }
  @media (max-width: 600px) {
    font-size: 18px;
    display: block;
    text-align: center;
    font-weight: bold;
    padding-top: 4px;
  }
`;

export const MenuItem = styled.div`
  display: flex;
  justify-content: flex-end;
  color: #fff;
  padding-top: 15px;
  padding-right: 20px;
  @media (max-width: 600px) {
    padding-top: 5px;
    justify-content: center;
    padding-right: 2px;
  }
`;

export const Item = styled.a`
  padding-left: 20px;
  cursor: pointer;
  text-decoration: none;
  color: #fff;
  &:hover {
    opacity: 0.65;
  }
  @media (max-width: 400px) {
    padding-left: 10px;
  }

`;
