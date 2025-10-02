CC = clang
CFLAGS = -Xpreprocessor -fopenmp -I/opt/homebrew/opt/libomp/include
LDFLAGS = -L/opt/homebrew/opt/libomp/lib -lomp

all: synchronization loops reduce map filter

synchronization: Tutorials/synchronization.c
	$(CC) $(CFLAGS) Tutorials/synchronization.c -o bin/synchronization $(LDFLAGS)

loops: Tutorials/loops.c
	$(CC) $(CFLAGS) Tutorials/loops.c -o bin/loops $(LDFLAGS)

reduce: Projects/reduce.c
	$(CC) $(CFLAGS) Projects/reduce.c -o bin/reduce $(LDFLAGS)

map: Projects/map.c
	$(CC) $(CFLAGS) Projects/map.c -o bin/map $(LDFLAGS)

filter: Projects/filter.c
	${CC} ${CFLAGS} Projects/filter.c -o bin/filter ${LDFLAGS}

dining_philosophers: Projects/dining_philosophers.c
	${CC} ${CFLAGS} Projects/dining_philosophers.c -o bin/dining_philosophers ${LDFLAGS}

dp2: Projects/dp2.c
	${CC} ${CFLAGS} Projects/dp2.c -o bin/dp2 ${LDFLAGS}