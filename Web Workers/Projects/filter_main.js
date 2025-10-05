// Get the worker module
const { Worker } = require('worker_threads');

const arr_len = 10;

const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

// Instantiate the values in the shared array
for (let i = 0; i < arr_len; i++) 
{
    sharedArray[i] = i;
}
console.log("Initial array:", sharedArray);


function runWorker(sharedData, indexStart, indexEnd, predicate)
{
    const dataForWorker ={
        sharedBuffer: sharedData,
        indexStart: indexStart,
        indexEnd: indexEnd,
        predicate: predicate,
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./filter_worker.js', { workerData: dataForWorker });

        // Get the message back from the thread
        worker.on('message', (msg) => {
            resolve(msg);
        });    
        worker.on('error', reject);
        worker.on('exit', (code) => {
        if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

function create_workers(sharedBuffer, n_workers, chunk_size, predicate) 
{
    // Instantiate a batch of workers
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {   
        const start = i * chunk_size;
        const end = Math.min(start + chunk_size, arr_len);

        if (start < end) {
            workers.push(runWorker(sharedBuffer, start, end, predicate));
        }
    }

    return workers;
}

async function run(n_workers)
{
    // Split the array into equal chunks
    const chunk_size = Math.ceil(arr_len / n_workers);

    // Create a batch of workers
    let workers = create_workers(sharedBuffer, n_workers, chunk_size, 'filter_1');

    // Wait for all workers and collect their messages
    // Additionally, get the total number of predicate results for each thread 
    const results = await Promise.all(workers);
    let sum = 0;
    for (let i = 0; i < results.length; i++) {
        sum += results[i];
    }

    // Create a shared buffer for the new filtered array
    const newSharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * sum);

    // Create a second batch of workers
    workers = create_workers(newSharedBuffer, n_workers, chunk_size, 'filter_2');



    console.log("Thread counts:", results);
}

run(4);
