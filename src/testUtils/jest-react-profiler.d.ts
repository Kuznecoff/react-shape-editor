declare module 'jest-react-profiler' {
  export function withProfiler<T>(component: T): T;
}

declare namespace jest {
  interface Matchers<R, T> {
    toHaveCommittedTimes: (times: number) => void;
  }

  interface Expect {
    toHaveCommittedTimes: (times: number) => void;
  }
}
