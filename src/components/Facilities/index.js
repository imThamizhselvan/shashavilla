import React, { Component } from 'react';
import { Header } from '../Gallery/style';
import {BigText, LeftSide, FacilitiesArea } from './style';

class Facilities extends Component {
  render() {
    return (
      <div id="facilities">
        <Header>
          <h1>Facilities</h1>
          <p>We have ample infra that resolves all your travel owes.</p>
        </Header>
        <FacilitiesArea>
          <LeftSide>
          <BigText>afslaf Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>
          <BigText>Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>
          <BigText>Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>

          </LeftSide>
          <div>
          <BigText>afslaf Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>
          <BigText>Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>
          <BigText>Enjoy a revitalizing stay in Peaceful Pondicherry </BigText>

          </div>
        </FacilitiesArea>
      </div>
    );
  }
}

export default Facilities;
