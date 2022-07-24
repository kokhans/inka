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

using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines.Blocks;
using Inka.Engine.Pipelines.Blocks.Abstracts;
using Inka.Engine.VirtualObjects;
using Inka.Engine.VirtualObjects.Providers.Abstracts;
using Spectre.Console;

namespace Inka.Engine.Pipelines;

public sealed class Pipeline
{
    private readonly ISpectreCliLogger _spectreCliLogger;
    private readonly ILocalStorageProvider _localStorageProvider;
    private readonly IVirtualObjectProvider _virtualObjectProvider;
    private readonly PipelineContext _pipelineContext;
    private readonly PipelineBlocks _pipelineBlocks;

    public Pipeline(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        IVirtualObjectProvider virtualObjectProvider,
        PipelineContext pipelineContext,
        PipelineBlocks pipelineBlocks
    )
    {
        ArgumentVerifier.NotNull(spectreCliLogger, nameof(spectreCliLogger));
        ArgumentVerifier.NotNull(localStorageProvider, nameof(localStorageProvider));
        ArgumentVerifier.NotNull(virtualObjectProvider, nameof(virtualObjectProvider));
        ArgumentVerifier.NotNull(pipelineContext, nameof(pipelineContext));
        ArgumentVerifier.NotNull(pipelineBlocks, nameof(pipelineBlocks));

        _spectreCliLogger = spectreCliLogger;
        _localStorageProvider = localStorageProvider;
        _virtualObjectProvider = virtualObjectProvider;
        _pipelineContext = pipelineContext;
        _pipelineBlocks = pipelineBlocks;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        bool hasException = false;

        _spectreCliLogger.LogFiglet("Inka", ft => ft.Alignment = Justify.Center);
        await _spectreCliLogger.StartLogStatus("Pipeline executing...", async scsc =>
        {
            _spectreCliLogger.LogInformation("Execute pipeline starting...");
            try
            {
                _spectreCliLogger.LogInformation("Delete output directory {0} starting...",
                    _pipelineContext.OutputDirectory
                );
                _localStorageProvider.DeleteDirectory(_pipelineContext.OutputDirectory);
                _spectreCliLogger.LogInformation("Delete output directory {0} finished.",
                    _pipelineContext.OutputDirectory
                );

                _spectreCliLogger.LogInformation("Delete temporary directories starting...");
                new DirectoryInfo(_pipelineContext.InputDirectory)
                    .GetDirectories()
                    .Where(di => di.Name.StartsWith(Predefined.Directory.TemporaryDirectoryPrefix))
                    .ToList()
                    .ForEach(di =>
                        {
                            _spectreCliLogger.LogInformation("Delete temporary directory {0} starting...",
                                di.FullName
                            );
                            _localStorageProvider.DeleteDirectory(di.FullName);
                            _spectreCliLogger.LogInformation("Delete temporary directory {0} finished.",
                                di.FullName
                            );
                        }
                    );
                _spectreCliLogger.LogInformation("Delete temporary directories finished.");

                _spectreCliLogger.LogInformation("Create temporary directory starting...");
                _pipelineContext.LocalTemporaryDirectory = _localStorageProvider.CreateTemporaryDirectory(
                    _pipelineContext.InputDirectory,
                    Predefined.Directory.TemporaryDirectoryPrefix
                );
                _spectreCliLogger.LogInformation(
                    "Create temporary directory {0} finished.",
                    _pipelineContext.LocalTemporaryDirectory.TemporaryDirectoryPath
                );

                _spectreCliLogger.LogInformation(
                    "Index virtual objects of input directory {0} starting...",
                    _pipelineContext.InputDirectory
                );
                VirtualObjectTree virtualObjectTree = await _virtualObjectProvider.IndexAsync(cancellationToken);
                _spectreCliLogger.LogInformation(
                    "Index virtual objects of input directory {0} finished.",
                    _pipelineContext.InputDirectory
                );

                scsc.SetStatus("Pipeline blocks executing...");
                foreach (PipelineBlock pipelineBlock in _pipelineBlocks)
                {
                    if (pipelineBlock.Type == PipelineBlockType.Parallel)
                    {
                        if (pipelineBlock is not ParallelPipelineBlock parallelBlock)
                            throw new ApplicationException("Block could not be cast as parallel.");

                        if (!parallelBlock.Pipes.Any())
                            throw new Exception("Parallel block pipes are empty.");

                        _spectreCliLogger.LogInformation("Execute parallel block starting...");
                        _spectreCliLogger.LogInformation("Parallel block pipes count: {0}",
                            parallelBlock.Pipes.Count
                        );
                        await Parallel.ForEachAsync(
                            parallelBlock.Pipes,
                            cancellationToken,
                            async (pipe, ct) =>
                            {
                                _spectreCliLogger.LogInformation("Pre-execute parallel block pipe starting...");
                                await pipe.PreExecuteAsync(scsc, virtualObjectTree, _pipelineContext, ct);
                                _spectreCliLogger.LogInformation("pre-execute parallel block pipe finished.");

                                _spectreCliLogger.LogInformation("Execute parallel block pipe starting...");
                                await pipe.ExecuteAsync(scsc, virtualObjectTree, _pipelineContext, ct);
                                _spectreCliLogger.LogInformation("Execute parallel block pipe finished.");

                                _spectreCliLogger.LogInformation("Post-execute parallel block pipe starting...");
                                await pipe.PostExecuteAsync(scsc, virtualObjectTree, _pipelineContext, ct);
                                _spectreCliLogger.LogInformation("Post-execute parallel block pipe finished.");
                            }
                        );
                        _spectreCliLogger.LogInformation("Execute parallel block finished.");
                    }
                    else
                    {
                        if (pipelineBlock is not SequentialPipelineBlock sequentialBlock)
                            throw new ApplicationException("Block could not be cast as sequential.");

                        if (sequentialBlock.Pipe is null)
                            throw new Exception("Sequential block pipe is null.");

                        _spectreCliLogger.LogRule($"[white][[{sequentialBlock.Pipe.Name}]][/]");

                        _spectreCliLogger.LogInformation("Execute sequential block starting...");

                        _spectreCliLogger.LogInformation("Pre-execute sequential block pipe starting...");
                        await sequentialBlock.Pipe.PreExecuteAsync(
                            scsc,
                            virtualObjectTree,
                            _pipelineContext,
                            cancellationToken
                        );
                        _spectreCliLogger.LogInformation("Pre-execute sequential block pipe finished.");

                        _spectreCliLogger.LogInformation("Execute sequential block pipe starting...");
                        await sequentialBlock.Pipe.ExecuteAsync(scsc, virtualObjectTree, _pipelineContext, cancellationToken);
                        _spectreCliLogger.LogInformation("Execute sequential block pipe finished.");

                        _spectreCliLogger.LogInformation("Post-execute sequential block pipe starting...");
                        await sequentialBlock.Pipe.PostExecuteAsync(scsc, virtualObjectTree, _pipelineContext,
                            cancellationToken);
                        _spectreCliLogger.LogInformation("Post-execute sequential block pipe finished.");

                        _spectreCliLogger.LogInformation("Execute sequential block finished.");
                    }
                }

                _spectreCliLogger.LogRule();
            }
            catch (Exception exception)
            {
                hasException = true;
                _spectreCliLogger.LogError(exception);
            }
            finally
            {
                _spectreCliLogger.LogInformation("Delete temporary directory {0} starting...",
                    _pipelineContext.LocalTemporaryDirectory!.TemporaryDirectoryPath
                );
                _localStorageProvider.DeleteDirectory(_pipelineContext.LocalTemporaryDirectory!.TemporaryDirectoryPath);
                _spectreCliLogger.LogInformation("Delete temporary directory {0} finished.",
                    _pipelineContext.LocalTemporaryDirectory!.TemporaryDirectoryPath
                );

                _spectreCliLogger.LogInformation("Execute pipeline finished.");
            }
        }, cancellationToken);

        if (hasException)
            Environment.Exit(-1);
        else
            Environment.Exit(0);
    }
}