import React, { Component } from 'react';
import { Card } from '../Card';
import { Area, DescText, Header } from './style';

class Tariff extends Component {
  render() {
    return (
      <div id="tariff">
        <Header>
          <h1>Tariff</h1>
          <p>We got rooms for every size of gang</p>
        </Header>
        <Area>
          <Card size='L' rate='3000' count='3'/>
          <Card size='XL' rate='4000' count='4'/>
          <Card size='XXL' rate='5000' count='5'/>
        </Area>
      </div>
    );
  }
}

export default Tariff;
