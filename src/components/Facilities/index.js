import React, { Component } from 'react';
import { Header } from '../Gallery/style';
import { Facility, BigText } from './style';

class Facilities extends Component {
  render() {
    return (
      <Facility id="facilities">
        <Header>
          <h1>Facilities</h1>
          <p>We have ample infra that resolves all your travel owes.</p>
        </Header>
        <div>
            <BigText> Huge parking area </BigText>
            <BigText> 24 hours Room Service </BigText>
            <BigText> Laundry service on request </BigText>
            <BigText> Airport shuttle & Guide Service </BigText>
            <BigText> Bicycle/Bike rental  </BigText>
            <BigText> Activities like Badminton, Gardening, campfire </BigText>
        </div>
      </Facility>
    );
  }
}

export default Facilities;
