#include <omp.h>
#include <stdio.h>

int main(int argc, char **argv)
{

    // 1. critical regions
    // The critical region is a mutually exlusive region. This means that
    // only one thread can enter this region at a time.
    printf("Exercise 1: \n");
    int i;
#pragma omp parallel num_threads(3)
    {
        for (i = 0; i < 5; i++)
        {
#pragma omp critical
            printf("Thread %d: Hello\n", omp_get_thread_num());
        }
    }

    // 2. Atomic regions
    // This protects the read and update of memory locations (variables)
    // So that race conditions do not occur whilst updating
    printf("\nExercise 2: \n");
    int y = 0;
#pragma omp parallel num_threads(4)
    {
        int b = omp_get_thread_num();
#pragma omp atomic
        y += b;
    }
    printf("y = %d\n", y);

    // 3. PI problem
    // Here we will use these mutual exclusion regions to improve our PI program
    printf("\nExercise 3: PI\n");
    static long num_steps = 100000;
    double step;
    int k;
    int n_threads = 4;
    double x, pi, sum = 0.0;

    step = 1.0 / (double)num_steps;

    double arr[n_threads];

#pragma omp parallel shared(arr) private(k) num_threads(n_threads)
    {
        int thread_id = omp_get_thread_num();
        int start = thread_id * (num_steps / n_threads);
        int end = (thread_id + 1) * (num_steps / n_threads);

        for (k = start; k < end; k++)
        {
            x = (k + 0.5) * step;
// Here to prevent cache line false sharing within the access and update of the arr array
#pragma omp atomic
            arr[thread_id] += (4.0 / (1.0 + x * x));
        }
    }

    for (int j = 0; j < n_threads; j++)
    {
        sum += arr[j];
    }
    pi = step * sum;
    printf("PI: %lf\n", sum);

    return 0;
}