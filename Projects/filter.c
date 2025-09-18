#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <stdbool.h>

// bool is_even() -> Returns whether an integer is even or not
//
// INPUTS
//  - int x -> The integer we want to determine is even or not
bool is_even(int x)
{
    return x % 2 == 0;
}

// int* serial_filter -> This function filters an array based on a predicate function and returns a new array
//  with only elements that pass the predicate function. This function is not parallel.
//
// INPUTS
//  - int* arr -> A pointer to the original array of elements
//  - int arr_len -> The length of the original array
//  - int* out_len -> The length of the output array
//  - int (*predicate_func)(int x) -> A function pointer to the predicate function
int *serial_filter(int *arr, int arr_len, int *out_len, bool (*predicate_func)(int x), double *serial_time)
{
    // Start the timing clock
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    int result_len = 0;
    // First we need to figure out the size of the resultant array
    for (int i = 0; i < arr_len; i++)
    {
        if (predicate_func(arr[i]))
        {
            result_len++;
        }
    }

    // Allocate the memory space for the result array
    *out_len = result_len;
    int *result = malloc(result_len * sizeof(int));

    // Add the necessary elements to the resultant array
    int pos = 0;
    for (int i = 0; i < arr_len; i++)
    {
        if (predicate_func(arr[i]))
        {
            result[pos] = arr[i];
            pos++;
        }
    }

    // End the timing clock
    clock_gettime(CLOCK_MONOTONIC, &end);

    double time_diff = (end.tv_sec - start.tv_sec) +
                       (end.tv_nsec - start.tv_nsec) / 1e9;
    *serial_time = time_diff;

    // Return the resulant array
    return result;
}

// int* parallel_filter -> This function filters an array based on a predicate function and returns a new array
//  with only the elements that return true from the original array. This function is parallel
//
// INPUTS
//  - int* arr -> A pointer to the original array of elements
//  - int arr_len -> The length of the original array
//  - int* out_len -> The length of the output array
//  - int (*predicate_func)(int x) -> A function pointer to the predicate function
int *parallel_filter(int *arr, int arr_len, int *out_len, bool (*predicate_func)(int x), double *parallel_time)
{
    int num_threads;
    int *counts;

    // Start the timing clock
    double start = omp_get_wtime();

// First we need to figure out how long the output array is going to be
// Since we cannot dynamically adjust an array within a parallel region
// without causing weird conditions
#pragma omp parallel
    {
        int tid = omp_get_thread_num();
        int local_count = 0;

// Iterate through the array and check how many times the predicate function returns true
// for the elements that the thread looks at
#pragma omp for
        for (int i = 0; i < arr_len; i++)
        {
            if (predicate_func(arr[i]))
            {
                local_count++;
            }
        }

// Allocate memoery for an array called counts
// This will hold the number of predicate true responses that each thread got
#pragma omp single
        {
            num_threads = omp_get_num_threads();
            counts = calloc(num_threads, sizeof(int));
        }

        // Set the corresponding predicate function count to each
        // thread in the count list
        counts[tid] = local_count;
    }

    // Now we need to calculate the offsets for the different threads
    // That is - which indices each thread can put the result of their predicate funcitons in
    int *offsets = malloc((num_threads + 1) * sizeof(int));

    // The first thread should start inserting its results at the first index
    offsets[0] = 0;
    // Calculate the index offset of each thread
    for (int i = 0; i < num_threads; i++)
    {
        offsets[i + 1] = offsets[i] + counts[i];
    }

    // Set the length of the resulting array
    // This will be whatever is in the final index of the offsets array
    *out_len = offsets[num_threads];

    // Instantiate the result array
    int *result = malloc((*out_len) * sizeof(int));

// Now we want to fill the resulting array in parallel
#pragma omp parallel
    {
        int tid = omp_get_thread_num();
        int pos = offsets[tid];

#pragma omp for
        for (int i = 0; i < arr_len; i++)
        {
            if (predicate_func(arr[i]))
            {
                result[pos] = arr[i];
                pos++;
            }
        }
    }

    // End the timing clock
    double end = omp_get_wtime();
    double time_diff = end - start;

    *parallel_time = time_diff;

    // Free up the space from the arrays
    free(counts);
    free(offsets);

    // Return the resulting array
    return result;
}

int main(int argc, char *argv[])
{
    // Create the array using the command line arg
    int arr_len = atoi(argv[1]);
    int arr[arr_len];
    for (int i = 0; i < arr_len; i++)
    {
        arr[i] = i;
    }

    int parallel_out_len;
    int serial_out_len;

    double parallel_time;
    double serial_time;

    int *parallel_filtered = parallel_filter(arr, arr_len, &parallel_out_len, is_even, &parallel_time);
    int *serial_filtered = serial_filter(arr, arr_len, &serial_out_len, is_even, &serial_time);

    // Print out the parallel array
    printf("Parallel:\n  Time: %lf\n", parallel_time);
    // printf("  Filtered array: ");
    // for (int i = 0; i < parallel_out_len; i++)
    // {
    //     printf("%d ", parallel_filtered[i]);
    // }
    printf("\n");

    // Print out the serial array
    printf("Serial:\n  Time: %lf\n", serial_time);
    // printf("  Filtered array: ");
    // for (int i = 0; i < serial_out_len; i++)
    // {
    //     printf("%d ", serial_filtered[i]);
    // }
    printf("\n");

    // Free up the the memory from the two resultant arrays
    free(parallel_filtered);
    free(serial_filtered);

    return 0;
}