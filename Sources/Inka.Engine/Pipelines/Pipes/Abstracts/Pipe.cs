// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Cli.Logging.Spectre.Loggers;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Inka.Engine.VirtualObjects;

namespace Inka.Engine.Pipelines.Pipes.Abstracts;

public interface IPipe
{
    string Name { get; }

    Task PreExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    );

    Task ExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    );

    Task PostExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    );
}

public abstract class Pipe : IPipe
{
    protected ISpectreCliLogger SpectreCliLogger { get; }
    protected PipeConfiguration Configuration { get; }

    protected Pipe(ISpectreCliLogger spectreCliLogger, PipeConfiguration configuration)
    {
        ArgumentVerifier.NotNull(spectreCliLogger, nameof(spectreCliLogger));
        ArgumentVerifier.NotNull(configuration, nameof(configuration));

        SpectreCliLogger = spectreCliLogger;
        Configuration = configuration;
    }

    public abstract string Name { get; }

    public virtual Task PreExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));

        return Task.CompletedTask;
    }

    public virtual Task ExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));

        return Task.CompletedTask;
    }

    public virtual Task PostExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));

        return Task.CompletedTask;
    }
}