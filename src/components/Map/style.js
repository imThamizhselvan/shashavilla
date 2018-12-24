import styled from 'styled-components';

export const MapMarkerStyle = styled.div`
  background-color: blue;
  width: 1rem;
  height: 1rem;
  display: block;
  left: -0.5rem;
  top: -0.5rem;
  position: relative;
  color: #ffffff;
  font-size: 0.6rem;
  border-radius: 1.5rem 1.5rem 0;
  transform: rotate(45deg);
  border: 1px solid #FFFFFF;
  &:after {
    position: 'absolute';
    content: '';
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    margin-left: -4px;
    margin-top: -4px;
    background-color: #fff;
  }
`;
