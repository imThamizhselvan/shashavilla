import styled, { keyframes } from 'styled-components';


export const moveUp = keyframes`
  from {
    margin-top: 200px;
  }

  to {
    top: 30%;
  }
`;

export const Center = styled.div`
  position: absolute;
  top: 30%;
  left: 10% ;
  font-size: 48px;
  text-align: center;
  color: #000000;
  font-weight: bolder;
  @media (max-width: 600px) {
    font-size: 18px;
    left: 5% ;
  }
`;

export const Img = styled.img`
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: block;
  width: 100%;
  height: 650px;
  opacity: 0.6;
  object-fit: cover;
`;

export const Home = styled.div`
  margin-top: 50px;
  position: relative;
`;

export const ImagePlaceHolder = styled.div`
  height: 650px;
`;