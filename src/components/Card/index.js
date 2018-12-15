import React, { Component } from 'react';
import { CardArea, Title, DescTitle, Rate, Desc } from './style';

export const Card = (props) => {
  return (
    <CardArea>
      <Title>
        {props.size}
      </Title>
      <Rate>
        {props.rate}
      </Rate>
      <DescTitle>
        Accommodates
      </DescTitle>
      <Desc>
        {props.count} people
      </Desc>
    </CardArea>
  );
};
