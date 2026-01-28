import morgan from 'morgan';

const requestLogger = morgan(':method :url :status :res[content-length] - :response-time ms');

export default requestLogger;
