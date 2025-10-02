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
void eat(int tid)
{
    printf("Thread %d is eating\n", tid);
    // sleep(1);
    return;
}

// void philosophers_eat() -> This runs the dining philosophers problem
//
// INPUTS
// - int num_threads -> This is the number of threads that should be running
// - int chopsticks[] -> Inticates the availbaility of chopstick i (chopsticks[i] = 1 implies available, 0 implies unavailable)
// - int eaten[] -> Inticates the number of times philosopher i has eaten so far
// - int num_eats -> Inticaties the number of times each philosopher must eat to complete the problem
void philosophers_eat(int n_threads, int chopsticks[], int eaten[], int num_eats)
{
    // Idea
    // A philosopher waits a random amout of time then tries to grab a left chopstick then a right one
    // If either are not available, then the philosopher drops both
    // The phiilosopher tries again until they have eaten the required number of times

#pragma omp parallel num_threads(n_threads)
    {
        int tid = omp_get_thread_num();
        srand(omp_get_wtime() + tid);
        int left = tid;
        int right = (tid + 1) % n_threads;

        for (int i = 0; i < num_eats; i++)
        {
            usleep(100000 + rand() % (50000 - 10000 + 1));
            // Attempt to grab the right and left chopsticks simultaneously
            // If they are not available, wait a random amount of time and then try again
            bool cont = true;
            while (cont)
            {
                // Enter a critical section so that you don't alter or read false information
#pragma omp critical
                {
                    if (chopsticks[left] == 1 && chopsticks[right] == 1)
                    {
                        chopsticks[left]--;
                        chopsticks[right]--;
                        cont = false;
                    }
                }
                // If we did not acquire the chopsticks, wait a random amount of time
                if (cont)
                {
                    int rand_int = 100000 + rand() % (50000 - 10000 + 1);
                    usleep(rand_int);
                }
            }

            // Have the philosopher eat
            eat(tid);
#pragma omp atomic
            eaten[tid]++;

            // Release the chopsticks once the thread is done eating
#pragma omp critical
            {
                chopsticks[left]++;
                chopsticks[right]++;
            }
        }
    }
}

int main(int argc, char *argv[])
{
    if (argc != 3) {
        printf("Invalid Arguments: please pass num_threads and num_eats \n");
        return 1;
    }
    int n_threads = atoi(argv[1]);
    int num_eats = atoi(argv[2]);

    int chopsticks[n_threads];
    int eaten[n_threads];
    for (int i = 0; i < n_threads; i++)
    {
        chopsticks[i] = 1;
        eaten[i] = 0;
    }

    philosophers_eat(n_threads, chopsticks, eaten, num_eats);

    for (int i = 0; i < n_threads; i++)
    {
        printf("Thread %d ate %d times\n", i, eaten[i]);
    }

    return 0;
}