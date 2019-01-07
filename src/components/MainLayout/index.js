import React, { Component } from 'react';
import { Home, Img, Center, ImagePlaceHolder } from './style';
import room from './room.jpeg';

class MainLayout extends Component {
  render() {
    return (
      <Home id="home">
        <ImagePlaceHolder>
          <Img src={room} />
        </ImagePlaceHolder>
        <Center> <p> Enjoy a revitalizing stay in Peaceful Pondicherry</p> <p> Stay at the international Township "Auroville" </p>  </Center>
      </Home>
    );
  }
}

export default MainLayout;
