import styled from 'styled-components';

export const Bar = styled.div`
  position: fixed;
  height: 50px;
  width: 100%;
  background: rgba(45,45,45,0.98);
  color: #fff;
  display: flex-container;
`;

export const Logo = styled.div`
  margin-left: 30px;
  text-align: center;
  margin-top: 6px;
  position: absolute;
  font-size: 30px;
  vertical-align: center;
  cursor: pointer;
  flex-grow: 6;
`;

export const MenuItem = styled.div`
  display: flex;
  justify-content: flex-end;
  color: #fff;
  margin-right: 10%;
  margin-top: 15px;
`;

export const Item = styled.a`
  margin-left: 20px;
  cursor: pointer;
  &:hover {
    opacity: 0.65;
  }
`;
