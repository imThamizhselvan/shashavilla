import styled from 'styled-components';

export const Bar = styled.div`
  height: 50px;
  background: rgba(45,45,45,0.98);
  color: #fff;
  display: flex-container;
  width: 100%;
  position: fixed;
`;

export const Logo = styled.a`
  padding-left: 30px;
  padding-top: 6px;
  font-size: 30px;
  cursor: pointer;
  float: left;
  text-decoration: none;
  color: #fff;
`;

export const MenuItem = styled.div`
  display: flex;
  justify-content: flex-end;
  color: #fff;
  padding-right: 10%;
  padding-top: 15px;
`;

export const Item = styled.a`
  padding-left: 20px;
  cursor: pointer;
  text-decoration: none;
  color: #fff;
  &:hover {
    opacity: 0.65;
  }
`;
