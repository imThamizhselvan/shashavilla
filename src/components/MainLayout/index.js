import React, { Component } from 'react';
import { Home, Img, Center, ImagePlaceHolder } from './style';

class MainLayout extends Component {
  render() {
    return (
      <Home id="home">
        <ImagePlaceHolder>
          <Img src={require('./room.jpeg')} />
        </ImagePlaceHolder>
        <Center> <p> Enjoy a revitalizing vacation in Peaceful Pondicherry</p> <p> Stay at the international Township "Auroville" </p>  </Center>
      </Home>
    );
  }
}

export default MainLayout;
