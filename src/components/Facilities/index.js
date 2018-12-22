import React, { Component } from 'react';
import { Header } from '../Gallery/style';
import { Facility, BigText, FacilitiesArea, FacilitiesAreaTwo } from './style';

class Facilities extends Component {
  render() {
    return (
      <Facility id="facilities">
        <Header>
          <h1>Facilities</h1>
          <p>We have ample infra that resolves all your travel owes.</p>
        </Header>
        <FacilitiesArea>
            <BigText> Huge parking area </BigText>
            <BigText> 24 hours Room Service </BigText>
            <BigText> Outdoor furnitures </BigText>
            <BigText> Meeting Room </BigText>
            <BigText> 24/7 Reception </BigText>
            <BigText> Laundry service on request </BigText>
        </FacilitiesArea>
        <FacilitiesAreaTwo>
            <BigText> Free drinking water </BigText>
            <BigText> Guide Service </BigText>
            <BigText> Airport shuttle </BigText>
            <BigText> Badminton equipment </BigText>
            <BigText> Bicycle/Bike rental  </BigText>
            <BigText> Garden </BigText>
        </FacilitiesAreaTwo>
      </Facility>
    );
  }
}

export default Facilities;
