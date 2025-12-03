(require racket/list)

(define list_length 10000)

(define num_threads 4)


; Create a list of odd numbers starting at 1
(define l1 (for/list ([i (in-range list_length)])
             (+ (* 2 i) 1)))

; serial map
(define expt2a
  (lambda ()
    (time (or (any-double? l1)
              (any-double? l2)))))

(define (split-into-n lst n)
  (let* ([len (length lst)]
         [chunk (quotient (+ len n -1) n)]) ; ceiling division for chunk size
    (for/list ([i (in-range n)])
      (take (drop lst (* i chunk)) chunk))))

; Experiment: Do the two things in parallel using futures.
(define expt2b
  (lambda ()
    (time (let ([f (future (lambda () (any-double? l2)))]) ; Create a future object that is running the any-double function on l2
            (or (any-double? l1) ; Execute any-double on l1 in the 'main thread'
                (touch f))))))

(define expt-multi
  (lambda ()
    (time
     (let* ([parts (split-into-n l1 num_threads)]
            [futures (for/list ([part parts])
                       (future (lambda () (any-double? part))))])
       (ormap touch futures))))) ; returns #t as soon as any future/touch is true
