#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <stdbool.h>
#include <assert.h>
#include <string.h>

// bool filter_func() -> Returns whether an integer is even or not
//
// INPUTS
//  - int x -> The integer we want to determine is even or not
bool filter_func(int x)
{
    int sum = 0;
    for (int i = 0; i < x; i++)
    {
        sum += 1;
    }

    return sum % 2 == 0;
}

// int* serial_filter -> This function filters an array based on a predicate function and returns a new array
//  with only elements that pass the predicate function. This function is not parallel.
//
// INPUTS
//  - int* arr -> A pointer to the original array of elements
//  - int arr_len -> The length of the original array
//  - int* out_len -> The length of the output array
//  - int (*predicate_func)(int x) -> A function pointer to the predicate function
int *serial_filter(int *arr, int arr_len, int *out_len, bool (*predicate_func)(int x), double *time)
{
    // Start the timing clock
    double start = omp_get_wtime();

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
    double end = omp_get_wtime();
    double time_diff = end - start;

    printf("Serial:\n  Time: %lf\n", time_diff);
    *time = time_diff;

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
int *parallel_filter(int *arr, int arr_len, int *out_len, bool (*predicate_func)(int x), int n_threads, double *time)
{
    int *counts;

    // Start the timing clock
    double start = omp_get_wtime();

// First we need to figure out how long the output array is going to be
// Since we cannot dynamically adjust an array within a parallel region
// without causing weird conditions
#pragma omp parallel num_threads(n_threads)
    {
        int tid = omp_get_thread_num();
        int local_count = 0;

// Iterate through the array and check how many times the predicate function returns true
// for the elements that the thread looks at
#pragma omp for schedule(static)
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
            counts = calloc(n_threads, sizeof(int));
        }

        // Set the corresponding predicate function count to each
        // thread in the count list
        counts[tid] = local_count;
    }

    // Now we need to calculate the offsets for the different threads
    // That is - which indices each thread can put the result of their predicate funcitons in
    int *offsets = malloc((n_threads + 1) * sizeof(int));

    // The first thread should start inserting its results at the first index
    offsets[0] = 0;
    // Calculate the index offset of each thread
    for (int i = 0; i < n_threads; i++)
    {
        offsets[i + 1] = offsets[i] + counts[i];
    }

    // Set the length of the resulting array
    // This will be whatever is in the final index of the offsets array
    *out_len = offsets[n_threads];

    // Instantiate the result array
    int *result = malloc((*out_len) * sizeof(int));

// Now we want to fill the resulting array in parallel
#pragma omp parallel num_threads(n_threads)
    {
        int tid = omp_get_thread_num();
        int pos = offsets[tid];

#pragma omp for schedule(static)
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

    printf("Parallel:\n  Time: %lf\n", time_diff);
    *time = time_diff;

    // Free up the space from the arrays
    free(counts);
    free(offsets);

    // Return the resulting array
    return result;
}

int main(int argc, char *argv[])
{
    if (argc != 2) {
        printf("Invalid Arguments: please pass num_threads \n");
        return 1;
    }
    // Create the array using the command line arg
    int arr_len = atoi(argv[1]);
    int arr[arr_len];
    for (int i = 0; i < arr_len; i++)
    {
        arr[i] = i;
    }

    // Open the CSV data file
    FILE *fp;
    fp = fopen("Data/filter_data.csv", "w"); // Open for writing, overwriting if exists

    if (fp == NULL)
    {
        printf("Error opening file!\n");
        exit(1); // Exit with an error code
    }

    // Write header row
    fprintf(fp, "Thread Count,Trial,Serial Time,Parallel Time, Array Size\n");

    for (int n_threads = 1; n_threads < 9; n_threads++)
    {
        for (int trial = 1; trial < 4; trial++)
        {
            int parallel_out_len;
            int serial_out_len;

            double parallel_time;
            double serial_time;

            int *parallel_filtered = parallel_filter(arr, arr_len, &parallel_out_len, filter_func, n_threads, &parallel_time);
            int *serial_filtered = serial_filter(arr, arr_len, &serial_out_len, filter_func, &serial_time);

            // Check that the two arrays are equal
            assert(parallel_out_len == serial_out_len);
            assert(memcmp(parallel_filtered, serial_filtered, parallel_out_len * sizeof(int)) == 0);
            printf("Assertion 1 passed: The two results are the same\n\n");

            // Write the data to the csv file
            fprintf(fp, "%d,%d,%lf,%lf,%d\n", n_threads, trial, serial_time, parallel_time, arr_len);

            // Free up the the memory from the two resultant arrays
            free(parallel_filtered);
            free(serial_filtered);
        }
    }

    fclose(fp); // Close the file
    printf("Data written to people.csv successfully\n");

    return 0;
}