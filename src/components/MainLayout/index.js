import React, { Component } from 'react';
import { Home, Img, Center } from './style';

class MainLayout extends Component {
  render() {
    return (
      <Home id="home">
        <Img src={require('./room.jpeg')} />
        <Center> <p> Enjoy a revitalizing stay in Peaceful Pondicherry</p> <p> Stay at the international Township "Auroville" </p>  </Center>
      </Home>
    );
  }
}

export default MainLayout;
