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
          <Card size='M' rate='1500' count='2'/>
          <Card size='L' rate='2500' count='4'/>
          <Card size='XL' rate='3000' count='6'/>
          <Card size='XXL' rate='4500' count='8'/>
        </Area>
      </div>
    );
  }
}

export default Tariff;
