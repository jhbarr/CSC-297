#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <stdbool.h>
#include <unistd.h>

// void eat() -> Prints that a thread is eating
//
// INPUTS
//  - int tid -> The id of the thread that is eating
void eat(int tid, int count)
{
    printf("Thread %d is eating, with count %d\n", tid, count);
    return;
}

// void semaphore() -> Implements a counting semaphore so that maximum n-1 threads can attempt to pick up a chopstick
//
// INPUTS
//  - int* count -> A pointer to the semaphore count value
//  - omp_lock_t* -> The address of the semaphore lock
void acquire_semaphore(int *count, omp_lock_t *sem_lock)
{
    // Have the thread loop continuously until it can aquire the semaphore lock
    // In that case, it can then exit this function and enter the critical section
    while (1)
    {
        omp_set_lock(sem_lock);
        // Check if the semaphore value is greater than zero
        // If so, we can enter the critical section
        if ((*count) > 0)
        {
            // Decrement the semaphore value by one
            (*count)--;
            omp_unset_lock(sem_lock);
            break;
        }
        omp_unset_lock(sem_lock);
    }
}

// void release_semaphore() -> This has a thread put down the semaphore lock so that another thread
//  can attempt to pick up the chopsticks
//
// INPUTS
//  - int tid -> Thread id number (0 through n)
//  - int* count -> A pointer to the semaphore count value
//  - omp_lock_t* -> The address of the semaphore lock
void release_semaphore(int tid, int *count, omp_lock_t *sem_lock)
{
#pragma omp atomic
    (*count)++;

    printf("Thread %d is done eating, with count %d\n", tid, (*count));
}

// void philosophers_eat() -> This runs the dining philosophers problem
//
// INPUTS
// - int num_threads -> This is the number of threads that should be running
void philosophers_eat(int tid, int n_threads, omp_lock_t chopsticks[], int count)
{
    int left = tid;
    int right = (tid + 1) % n_threads;

    omp_set_lock(&chopsticks[left]);
    omp_set_lock(&chopsticks[right]);

    // Have the thread eat
    eat(tid, count);

    // Put down the chopsticks
    omp_unset_lock(&chopsticks[left]);
    omp_unset_lock(&chopsticks[right]);
}

int main(int argc, char *argv[])
{
    if (argc != 2) {
        printf("Invalid Arguments: please pass num_threads \n");
        return 1;
    }
    int n_threads = atoi(argv[1]);

    // Initialize chopstick lock
    omp_lock_t chopsticks[n_threads];
    for (int i = 0; i < n_threads; i++)
    {
        omp_init_lock(&chopsticks[i]);
    }

    // Initialize "semaphore" variables
    int count = n_threads - 1;
    omp_lock_t sem_lock;
    omp_init_lock(&sem_lock);

#pragma omp parallel num_threads(n_threads)
    {
        int tid = omp_get_thread_num();
        acquire_semaphore(&count, &sem_lock);

        philosophers_eat(tid, n_threads, chopsticks, count);

        release_semaphore(tid, &count, &sem_lock);
    }

    return 0;
}