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

using System.Diagnostics.CodeAnalysis;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core.Locators;
using Carcass.LocalStorage.Providers.Abstracts;
using Inka.Engine.Pipelines;
using Inka.Engine.Pipelines.Blocks;
using Inka.Engine.VirtualObjects.Providers.Abstracts;

namespace Inka.Engine.Bootstrapping;

public sealed class Bootstrapper
{
    [SuppressMessage("Performance", "CA1822:Mark members as static")]
    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        await new Pipeline(
            ServiceProviderLocator.Current.GetRequiredService<ISpectreCliLogger>(),
            ServiceProviderLocator.Current.GetRequiredService<ILocalStorageProvider>(),
            ServiceProviderLocator.Current.GetRequiredService<IVirtualObjectProvider>(),
            ServiceProviderLocator.Current.GetRequiredService<PipelineContext>(),
            ServiceProviderLocator.Current.GetRequiredService<PipelineBlocks>()
        ).ExecuteAsync(cancellationToken);
    }

    public static BootstrapperBuilder New() => new(BootstrapperContextFactory.New());
}