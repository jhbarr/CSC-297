
// TODO: update this function to summation

// Worker function: sum with factorial
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function reduce_func(x, y) {
    return x + factorial(y);
}

// Worker reduction function: sum assigned chunks and return numeric partial sum
onmessage = function(event) {
    const data = event.data;
    const arrayBuffer = data.arrayBuffer;
    const indexChunks = data.indexChunks;

    const array = new Int32Array(arrayBuffer);
    let partialSum = 0;
    for (let j = 0; j < indexChunks.length; j++) {
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];
        for (let i = indexStart; i < indexEnd; i++) {
            const val = array[i];
            partialSum = reduce_func(partialSum, val, i);
        }
    }
    this.postMessage({ status: "done", result: partialSum});
}