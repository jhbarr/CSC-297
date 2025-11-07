// Grab DOM elements
const input = document.getElementById('numberInput');
const workerInput = document.getElementById('workerInput');
const chunkInput = document.getElementById('chunkInput');
const button = document.getElementById('sendButton');
const output = document.getElementById('output');

function create_workers(worker, data) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            if (event.data.status === 'done') {
                resolve(event.data.result);
            }
        }
        worker.onerror = (error) => {
            reject(error);
        };

        // Post the message to the worker
        worker.postMessage(data);
    });
}

async function run_workers(n_workers, max_chunk, arr_len)
{
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer);

     // Instantiate the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        sharedArray[i] = i;
    }

    // Get the start time
    const start = performance.now()

    // Create the index chunks of specified size
    const chunks = [];
    for (let i = 0; i < arr_len; i += max_chunk)
    {
        const start = i;
        const end = Math.min(i + max_chunk, arr_len);

        chunks.push([start, end]);
    }

    const worker_chunks = Array.from({ length: n_workers }, () => []);
        chunks.forEach((range, i) => {
            worker_chunks[i % n_workers].push(range);
    });

    // Create the worker objects
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {
        workers.push(new Worker('reduce_worker.js'));
    }

    // Collect all of the promises for the workers
    const workerPromises = workers.map((worker, index) => {
        // Create a data object to pass to the workers
        const worker_data = {
            sharedBuffer: sharedBuffer,
            indexChunks: worker_chunks[index]
        }

        return create_workers(worker, worker_data);
    });


    // Wait for all of the promises to resolve
    const partials = await Promise.all(workerPromises)
        .catch((error) => {
            // One or more workers encountered an error
            console.error('One or more workers failed:', error);
            throw error;
        });
    
    console.log(partials)
    
    // Combine partial sums into final sum
    const finalSum = partials.reduce((acc, val) => acc + (Number(val) || 0), 0);

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [finalSum, totalTime];
}


// Send message to worker when button clicked
button.addEventListener('click', async () => {
    const arr_len = parseInt(input.value);
    const n_workers = parseInt(workerInput.value);
    const max_chunk = parseInt(chunkInput.value);

    try {
        const results = await run_workers(n_workers, max_chunk, arr_len); // wait for promise to resolve
        const arr = results[0];
        const time = results[1];

        console.log('Final array:', arr);
        output.textContent = `Reduced Array: ${arr}\nTime: ${time}`;
    } catch (err) {
        output.textContent = 'Error running workers: ' + err.message;
    }
});