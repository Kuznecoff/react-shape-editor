declare module 'jest-react-profiler' {
  export function withProfiler(component: React.Component): React.Component;
}

declare namespace jest {
  interface Matchers<R, T> {
    toHaveCommittedTimes: (times: number) => void;
  }

  interface Expect {
    toHaveCommittedTimes: (times: number) => void;
  }
}
