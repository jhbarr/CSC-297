// Sums intergers up to n
function summation(n) {
    let result = 0;
    for (let i = 1; i <= n; i++) {
        result += i;
    }
    return result;
}

// Reduction function (addition and summation)
function reduce_func(x, y) {
    return x + summation(y);
}

function run_reduce(sharedBuffer, indexChunk)
{
    // Wrap the memory buffers with an array wrapper for easier access and update
    const sharedArray = new Int32Array(sharedBuffer);
    let partialSum = 0

    const indexStart = indexChunk[0];
    const indexEnd = indexChunk[1];

    // Iterate through the index chunk in the array
    for (let i = indexStart; i < indexEnd; i++) {
        const val = sharedArray[i];
        partialSum = reduce_func(partialSum, val);
    }

    return partialSum;
} 

// Add a listener for messages from the main thread
onmessage = function (event) {
    const {sharedBuffer, indexChunk} = event.data;

    // Run the map using the provided data
    const partial = run_reduce(sharedBuffer, indexChunk);

    this.postMessage({ status: 'done', partial: partial});
};