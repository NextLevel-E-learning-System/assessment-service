import { connect, Channel } from 'amqplib';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger.js';

const EXCHANGE = 'domain.events';
let channel: Channel | null = null;

async function getChannel(){
  if(channel) return channel;
  const url = process.env.RABBITMQ_URL;
  if(!url) throw new Error('RABBITMQ_URL not set');
  const conn = await connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE,'topic',{ durable:true });
  return channel;
}

interface DomainEvent<T>{ eventId:string; type:string; occurredAt:string; payload:T }

export async function publishEvent<T>(type:string, payload:T){
  try {
    const ch = await getChannel();
    const evt:DomainEvent<T> = { eventId: randomUUID(), type, occurredAt: new Date().toISOString(), payload };
    const key = type.replace(/\./g,'/');
    ch.publish(EXCHANGE, key, Buffer.from(JSON.stringify(evt)), { contentType:'application/json' });
    logger.info({ event:type, eventId: evt.eventId }, 'assessment_event_published');
  } catch(err){ logger.error({ err }, 'publish_event_failed'); }
}
