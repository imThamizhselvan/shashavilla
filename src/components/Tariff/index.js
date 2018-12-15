import React, { Component } from 'react';
import { Card } from '../Card';
import { Area, DescText } from './style';

class Tariff extends Component {
  render() {
    return (
      <div>
        <DescText> Whether you are a couple or family or gang. </DescText>
        <DescText> We have got your priorities correctly</DescText>
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
